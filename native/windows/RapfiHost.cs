using System;
using System.ComponentModel;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;

// 在恢复引擎线程之前加入 Job；父进程消失或守护进程退出都会回收引擎。
internal static class RapfiHost
{
    private const uint Synchronize = 0x00100000;
    private const uint KillOnJobClose = 0x00002000;
    private const uint CreateSuspended = 0x00000004;
    private const uint CreateNoWindow = 0x08000000;
    private const uint UseStdHandles = 0x00000100;
    private const uint Infinite = 0xffffffff;

    [StructLayout(LayoutKind.Sequential)]
    private struct BasicLimit
    {
        public long PerProcessTime, PerJobTime;
        public uint Flags;
        public UIntPtr MinWorkingSet, MaxWorkingSet;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint PriorityClass, SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct IoCounters
    {
        public ulong ReadOperations, WriteOperations, OtherOperations;
        public ulong ReadBytes, WriteBytes, OtherBytes;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct ExtendedLimit
    {
        public BasicLimit Basic;
        public IoCounters Io;
        public UIntPtr ProcessMemory, JobMemory, PeakProcessMemory, PeakJobMemory;
    }

    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    private struct StartupInfo
    {
        public uint Size;
        public string Reserved, Desktop, Title;
        public uint X, Y, Width, Height, XChars, YChars, Fill, Flags;
        public ushort ShowWindow, ReservedSize;
        public IntPtr ReservedData, Input, Output, Error;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct ProcessInfo
    {
        public IntPtr Process, Thread;
        public uint ProcessId, ThreadId;
    }

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr OpenProcess(uint access, bool inherit, uint id);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr CreateJobObject(IntPtr attributes, string name);
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool SetInformationJobObject(IntPtr job, int kind, ref ExtendedLimit info, uint size);
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern bool CreateProcess(string app, StringBuilder command, IntPtr processAttributes,
        IntPtr threadAttributes, bool inherit, uint flags, IntPtr environment, string directory,
        ref StartupInfo startup, out ProcessInfo info);
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern uint ResumeThread(IntPtr thread);
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern uint WaitForMultipleObjects(uint count, IntPtr[] handles, bool all, uint timeout);
    [DllImport("kernel32.dll")]
    private static extern IntPtr GetStdHandle(int kind);
    [DllImport("kernel32.dll")]
    private static extern bool CloseHandle(IntPtr handle);
    [DllImport("kernel32.dll")]
    private static extern bool TerminateProcess(IntPtr process, uint code);
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool GetExitCodeProcess(IntPtr process, out uint code);

    private static void Require(bool success)
    {
        if (!success) throw new Win32Exception(Marshal.GetLastWin32Error());
    }

    public static int Main(string[] args)
    {
        IntPtr parent = IntPtr.Zero, job = IntPtr.Zero;
        ProcessInfo child = new ProcessInfo();
        try
        {
            if (args.Length != 2) throw new ArgumentException("需要父进程 PID 和引擎绝对路径。");
            parent = OpenProcess(Synchronize, false, uint.Parse(args[0]));
            Require(parent != IntPtr.Zero);
            job = CreateJobObject(IntPtr.Zero, null);
            Require(job != IntPtr.Zero);
            var limits = new ExtendedLimit();
            limits.Basic.Flags = KillOnJobClose;
            Require(SetInformationJobObject(job, 9, ref limits, (uint)Marshal.SizeOf(limits)));
            string executable = Path.GetFullPath(args[1]);
            var startup = new StartupInfo();
            startup.Size = (uint)Marshal.SizeOf(startup);
            startup.Flags = UseStdHandles;
            startup.Input = GetStdHandle(-10);
            startup.Output = GetStdHandle(-11);
            startup.Error = GetStdHandle(-12);
            Require(CreateProcess(executable, new StringBuilder("\"" + executable + "\""),
                IntPtr.Zero, IntPtr.Zero, true, CreateSuspended | CreateNoWindow, IntPtr.Zero,
                Path.GetDirectoryName(executable), ref startup, out child));
            Require(AssignProcessToJobObject(job, child.Process));
            Require(ResumeThread(child.Thread) != Infinite);
            // 持有真实进程句柄，避免 PID 重用导致漏清理或误操作其他进程。
            uint result = WaitForMultipleObjects(2, new[] { parent, child.Process }, false, Infinite);
            Require(result != Infinite);
            if (result == 1)
            {
                uint code;
                Require(GetExitCodeProcess(child.Process, out code));
                return unchecked((int)code);
            }
            return 0;
        }
        catch (Exception error)
        {
            Console.Error.WriteLine("Rapfi 进程守护失败：" + error.Message);
            return 1;
        }
        finally
        {
            // 即使加入 Job 失败，处于挂起状态的引擎也不能残留。
            if (child.Process != IntPtr.Zero) TerminateProcess(child.Process, 0);
            if (child.Thread != IntPtr.Zero) CloseHandle(child.Thread);
            if (child.Process != IntPtr.Zero) CloseHandle(child.Process);
            if (job != IntPtr.Zero) CloseHandle(job);
            if (parent != IntPtr.Zero) CloseHandle(parent);
        }
    }
}
