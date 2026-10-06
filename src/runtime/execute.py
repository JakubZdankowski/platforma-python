"""Small execution wrapper; the student's globals never become wrapper locals."""

def _execute_student(source, input_message):
    import builtins
    import json
    import sys
    import traceback

    stdout, stderr = sys.stdout, sys.stderr

    def unavailable_input(prompt=""):
        raise NotImplementedError(input_message)

    student_builtins = dict(vars(builtins))
    student_builtins["input"] = unavailable_input
    namespace = {"__name__": "__main__", "__builtins__": student_builtins}
    try:
        exec(compile(source, "main.py", "exec"), namespace)
        result = {"success": True}
    except BaseException as error:
        # Remove only this wrapper's exec frame, retaining the learner's traceback.
        frames = error.__traceback__.tb_next if error.__traceback__ else None
        result = {
            "success": False,
            "errorType": type(error).__name__,
            "errorMessage": str(error)[:4000],
            "traceback": "".join(traceback.format_exception(type(error), error, frames))[:12000],
        }
    finally:
        sys.stdout, sys.stderr = stdout, stderr
        stdout.flush()
        stderr.flush()
    return json.dumps(result)

_execute_student(_source, _input_message)
